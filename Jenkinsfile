pipeline {
    agent any
    
    environment {
        RENDER_SERVICE_ID = 'srv-cvdra0dumphs73bkdmug'
        PYTHON_VERSION = '3.9'
        DEPLOY_TIMEOUT = '300'  // 5 minutes timeout for deployment
        RENDER_API_KEY = 'rnd_TL0axwFQR6pGC7mRf13Zh1MoybCx'
    }
    
    options {
        skipDefaultCheckout(false)  // Change this to false to ensure checkout happens
        disableConcurrentBuilds()
    }
    
    stages {
        stage('Prepare Workspace') {
            steps {
                cleanWs()
                checkout scm
                sh 'pwd && ls -la'  // Debug: Print current directory and its contents
            }
        }
        
        stage('Build and Test') {
            agent {
                docker {
                    image "python:${PYTHON_VERSION}"
                    args '-u root -v $WORKSPACE:/app'
                    reuseNode true
                }
            }
            steps {
                script {
                    sh '''
                        cd /app
                        pwd && ls -la  // Debug: Print current directory and its contents
                        python --version
                        pip install --no-cache-dir -r requirements.txt
                        pip install --no-cache-dir flake8 black pylint pytest pytest-cov pytest-html bandit safety
                        mkdir -p test-results
                    '''
                }
            }
        }
        
        stage('Parallel Checks') {
            parallel {
                stage('Code Quality') {
                    steps {
                        sh '''
                            cd /app
                            flake8 . --exclude=venv,tests || true
                            black . --check || true
                            pylint --recursive=y . || true
                        '''
                    }
                }
                
                stage('Unit Tests') {
                    steps {
                        sh '''
                            cd /app
                            python -m pytest tests/ \
                                --cov=. \
                                --cov-report=xml \
                                --cov-report=html \
                                --html=test-results/report.html \
                                -v || true
                        '''
                    }
                }
                
                stage('Security Scan') {
                    steps {
                        sh '''
                            cd /app
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
                    
                    def timeout = DEPLOY_TIMEOUT.toInteger()
                    def startTime = System.currentTimeMillis()
                    def checkInterval = 10 // Check every 10 seconds
                    
                    waitUntil(timeout: timeout) {
                        sleep checkInterval
                        
                        def status = sh(script: """
                            curl -H "Authorization: Bearer ${RENDER_API_KEY}" \
                            "https://api.render.com/v1/services/${RENDER_SERVICE_ID}"
                        """, returnStdout: true).trim()
                        
                        if (status.contains('"status":"live"')) {
                            echo "Deployment completed successfully!"
                            return true
                        } else if (status.contains("error") || status.contains("Unauthorized")) {
                            error "Error checking deployment status: ${status}"
                        } else {
                            echo "Deployment still in progress. Current status: ${status}"
                            return false
                        }
                    }
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
            sh 'docker system prune -f || true'
            sh 'docker volume prune -f || true'
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed! Check the logs for details.'
        }
    }
}
