pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'python:3.8'
        APP_CONTAINER_NAME = 'flask-app-container'
        APP_PORT = '3000'  // Changed to use port 3000
    }

    stages {
        stage('Cleanup Previous Deployment') {
            steps {
                script {
                    // Clean up any existing containers with the same name
                    sh '''
                        if docker ps -a | grep -q ${APP_CONTAINER_NAME}; then
                            docker stop ${APP_CONTAINER_NAME}
                            docker rm ${APP_CONTAINER_NAME}
                        fi
                    '''
                    
                    // Kill any process using our port
                    sh '''
                        if netstat -tuln | grep :${APP_PORT}; then
                            pid=$(lsof -t -i:${APP_PORT} || true)
                            if [ ! -z "$pid" ]; then
                                kill -9 $pid || true
                            fi
                        fi
                    '''
                }
            }
        }

        stage('Checkout') {
            steps {
                // Checkout code from Git repository
                checkout scm
            }
        }

        stage('Build and Run Container') {
            steps {
                script {
                    try {
                        // Run the container with the Flask application
                        sh """
                            docker run -d --name ${APP_CONTAINER_NAME} \
                                -p ${APP_PORT}:8000 \
                                -v ${WORKSPACE}:/app \
                                -w /app \
                                ${DOCKER_IMAGE} \
                                /bin/bash -c "pip install -r requirements.txt && gunicorn --bind 0.0.0.0:8000 wsgi:app --access-logfile - --error-logfile -"
                        """
                        
                        // Wait for container to be running
                        sh 'sleep 10'
                        
                        // Check if container is running
                        def containerRunning = sh(script: "docker ps | grep ${APP_CONTAINER_NAME}", returnStatus: true)
                        if (containerRunning != 0) {
                            error "Container failed to start"
                        }
                    } catch (Exception e) {
                        error "Failed to start container: ${e.message}"
                    }
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                script {
                    // Test the application
                    def maxRetries = 5
                    def retryCount = 0
                    def success = false
                    
                    while (!success && retryCount < maxRetries) {
                        def response = sh(script: "curl -s -o /dev/null -w '%{http_code}' http://localhost:${APP_PORT}", returnStdout: true).trim()
                        if (response == "200" || response == "302") {
                            success = true
                            echo "Application is responding on port ${APP_PORT}"
                        } else {
                            retryCount++
                            if (retryCount < maxRetries) {
                                echo "Attempt ${retryCount} failed, retrying in 5 seconds..."
                                sleep 5
                            }
                        }
                    }
                    
                    if (!success) {
                        error "Application failed to respond after ${maxRetries} attempts"
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                // Print container logs
                sh 'docker logs ${APP_CONTAINER_NAME} || true'
                
                // Print application URL
                echo "Application URL: http://localhost:${APP_PORT}"
            }
        }
        failure {
            script {
                // Cleanup on failure
                sh '''
                    docker stop ${APP_CONTAINER_NAME} || true
                    docker rm ${APP_CONTAINER_NAME} || true
                '''
            }
        }
    }
}
