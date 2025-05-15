pipeline {
    agent any
    
    environment {
        RENDER_SERVICE_ID = 'srv-cvdra0dumphs73bkdmug'
        PYTHON_VERSION = '3.9'
        DEPLOY_TIMEOUT = '300'  // 5 minutes timeout for deployment
        RENDER_API_KEY = 'rnd_TL0axwFQR6pGC7mRf13Zh1MoybCx'
    }
    
    options {
        skipDefaultCheckout()  // Skip the default checkout
        disableConcurrentBuilds()  // Prevent concurrent builds
    }
    
    stages {
        stage('Prepare Workspace') {
            steps {
                script {
                    try {
                        cleanWs()  // Clean workspace before build
                        checkout scm  // Checkout code
                    } catch (Exception e) {
                        error "Failed to prepare workspace: ${e.getMessage()}"
                    }
                }
            }
        }
        
        stage('Test Docker') {
            steps {
                script {
                    try {
                        sh '''
                            docker --version
                            docker info
                            docker run hello-world
                            docker system prune -f  # Clean up after test
                        '''
                    } catch (Exception e) {
                        error "Docker test failed: ${e.getMessage()}"
                    }
                }
            }
        }
        
        stage('Code Quality') {
            steps {
                script {
                    docker.image("python:${PYTHON_VERSION}").inside('-u root') {
                        sh '''
                            pip install flake8 black pylint
                            flake8 . --exclude=venv,tests || true
                            black . --check || true
                            pylint --recursive=y . || true
                        '''
                    }
                }
            }
        }
        
        stage('Build and Test') {
            steps {
                script {
                    docker.image("python:${PYTHON_VERSION}").inside('-u root') {
                        try {
                            sh '''
                                python --version
                                pip install --no-cache-dir -r requirements.txt
                                pip install --no-cache-dir pytest pytest-cov pytest-html
                                mkdir -p test-results
                                python -m pytest tests/ \
                                    --cov=. \
                                    --cov-report=xml \
                                    --cov-report=html \
                                    --html=test-results/report.html \
                                    -v || true
                            '''
                        } catch (Exception e) {
                            error "Build and test failed: ${e.getMessage()}"
                        }
                    }
                }
            }
        }
        
        stage('Security Scan') {
            steps {
                script {
                    docker.image("python:${PYTHON_VERSION}").inside('-u root') {
                        sh '''
                            pip install bandit safety
                            bandit -r . -x tests/ || true
                            safety check || true
                        '''
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    try {
                        // Trigger deployment
                        def deployResponse = sh(script: """
                            curl -X POST \
                            -H "Accept: application/json" \
                            -H "Content-Type: application/json" \
                            -H "Authorization: Bearer ${RENDER_API_KEY}" \
                            "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys"
                        """, returnStdout: true).trim()
                        
                        echo "Deployment triggered: ${deployResponse}"
                        
                        if (deployResponse.contains("error") || deployResponse.contains("Unauthorized")) {
                            error "Failed to trigger deployment: ${deployResponse}"
                        }
                        
                        // Wait for deployment to complete
                        def deploymentComplete = false
                        def timeout = DEPLOY_TIMEOUT.toInteger()
                        def startTime = System.currentTimeMillis()
                        def checkInterval = 20 // Check every 20 seconds
                        
                        while (!deploymentComplete && (System.currentTimeMillis() - startTime) < (timeout * 1000)) {
                            sleep checkInterval
                            
                            def status = sh(script: """
                                curl -H "Authorization: Bearer ${RENDER_API_KEY}" \
                                "https://api.render.com/v1/services/${RENDER_SERVICE_ID}"
                            """, returnStdout: true).trim()
                            
                            if (status.contains('"status":"live"')) {
                                deploymentComplete = true
                                echo "Deployment completed successfully!"
                            } else if (status.contains("error") || status.contains("Unauthorized")) {
                                error "Error checking deployment status: ${status}"
                            } else {
                                echo "Deployment still in progress. Current status: ${status}"
                            }
                        }
                        
                        if (!deploymentComplete) {
                            error "Deployment timed out after ${timeout} seconds"
                        }
                    } catch (Exception e) {
                        error "Deployment failed: ${e.getMessage()}"
                    }
                }
            }
        }
    }
    
    post {
        always {
            script {
                try {
                    // Clean workspace
                    cleanWs(
                        cleanWhenSuccess: true,
                        cleanWhenFailure: true,
                        cleanWhenAborted: true,
                        deleteDirs: true
                    )
                    
                    // Clean Docker
                    sh '''
                        docker system prune -f || true
                        docker volume prune -f || true
                    '''
                } catch (Exception e) {
                    echo "Cleanup failed: ${e.getMessage()}"
                }
            }
        }
        success {
            script {
                echo 'Pipeline completed successfully!'
                // Add notification here if needed
                // slackSend channel: '#deployments', color: 'good', message: "Deploy successful: ${env.JOB_NAME} ${env.BUILD_NUMBER}"
            }
        }
        failure {
            script {
                echo 'Pipeline failed! Check the logs for details.'
                // Add notification here if needed
                // slackSend channel: '#deployments', color: 'danger', message: "Deploy failed: ${env.JOB_NAME} ${env.BUILD_NUMBER}"
            }
        }
    }
}
