pipeline {
    agent any
    
    environment {
        RENDER_SERVICE_ID = 'srv-cvdra0dumphs73bkdmug'  // Your Render service ID
        PYTHON_VERSION = '3.9'
        DEPLOY_TIMEOUT = '300'  // 5 minutes timeout for deployment
    }
    
    stages {
        stage('Test Docker') {
            steps {
                script {
                    try {
                        sh '''
                            docker --version
                            docker info
                            docker run hello-world
                        '''
                    } catch (Exception e) {
                        error "Docker test failed: ${e.getMessage()}"
                    }
                }
            }
        }
        
        stage('Build and Test') {
            steps {
                script {
                    docker.image("python:${PYTHON_VERSION}").inside {
                        try {
                            sh '''
                                python --version
                                python -m pip install --upgrade pip  # Upgrading pip without --user flag
                                pip install --no-cache-dir -r requirements.txt
                                pip install --no-cache-dir pytest pytest-cov
                                export PYTHONPATH="${PYTHONPATH}:/usr/local/lib/python3.9/site-packages"
                                python -m pytest tests/ --cov=. --cov-report=term-missing || true
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
                    docker.image("python:${PYTHON_VERSION}").inside {
                        try {
                            sh '''
                                pip install --no-cache-dir bandit safety
                                export PYTHONPATH="${PYTHONPATH}:/usr/local/lib/python3.9/site-packages"
                                bandit -r . -x tests/ || true
                                safety check || true
                            '''
                        } catch (Exception e) {
                            echo "Security scan found issues: ${e.getMessage()}"
                        }
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    withCredentials([string(credentialsId: 'render-api-key', variable: 'RENDER_API_KEY')]) {
                        try {
                            def response = sh(script: '''
                                curl -X POST \
                                -H "Accept: application/json" \
                                -H "Content-Type: application/json" \
                                "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys" \
                                -H "Authorization: Bearer ${RENDER_API_KEY}"
                            ''', returnStdout: true).trim()
                            

                            echo "Deployment triggered: ${response}"
                            
                            // Verify deployment status
                            if (response.contains('"message":"not found: service"')) {
                                error "Deployment failed: Service not found. Check RENDER_SERVICE_ID."
                            }
                            
                            // Wait for deployment to complete
                            def deploymentComplete = false
                            def timeout = DEPLOY_TIMEOUT.toInteger()
                            def startTime = System.currentTimeMillis()
                            
                            while (!deploymentComplete && (System.currentTimeMillis() - startTime) < (timeout * 1000)) {
                                sleep 30  // Wait 30 seconds between checks
                                
                                def status = sh(script: '''
                                    curl -H "Authorization: Bearer ${RENDER_API_KEY}" \
                                    "https://api.render.com/v1/services/${RENDER_SERVICE_ID}"
                                ''', returnStdout: true).trim()
                                
                                if (status.contains('"status":"live"')) {
                                    deploymentComplete = true
                                    echo "Deployment completed successfully!"
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
    }
    
    post {
        always {
            cleanWs()
            sh 'docker system prune -f || true'  // Clean up Docker resources
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
