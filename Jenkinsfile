pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'python:3.8'
        APP_CONTAINER_NAME = 'flask-app-container'
        APP_PORT = '3000'
    }

    stages {
        stage('Cleanup Previous Deployment') {
            steps {
                script {
                    sh '''
                        docker stop ${APP_CONTAINER_NAME} || true
                        docker rm ${APP_CONTAINER_NAME} || true
                    '''
                }
            }
        }

        stage('Checkout and Verify Files') {
            steps {
                script {
                    // Checkout code
                    checkout scm
                    
                    // List workspace contents
                    sh 'ls -la'
                    
                    // Verify required files exist
                    def requiredFiles = ['requirements.txt', 'wsgi.py']
                    requiredFiles.each { file ->
                        if (!fileExists(file)) {
                            error "Required file ${file} not found in workspace"
                        }
                    }
                    
                    // Create requirements.txt if it doesn't exist
                    if (!fileExists('requirements.txt')) {
                        writeFile file: 'requirements.txt', text: '''
                            Flask==3.0.0
                            gunicorn==21.2.0
                            Werkzeug==3.0.1
                        '''
                    }
                }
            }
        }

        stage('Build and Run Container') {
            steps {
                script {
                    try {
                        // Create a Dockerfile
                        writeFile file: 'Dockerfile', text: '''
                            FROM python:3.8
                            WORKDIR /app
                            COPY requirements.txt .
                            RUN pip install -r requirements.txt
                            COPY . .
                            EXPOSE 8000
                            CMD ["gunicorn", "--bind", "0.0.0.0:8000", "wsgi:app", "--access-logfile", "-", "--error-logfile", "-"]
                        '''

                        // Build and run the container
                        sh """
                            docker build -t flask-app:latest .
                            docker run -d --name ${APP_CONTAINER_NAME} \
                                -p ${APP_PORT}:8000 \
                                flask-app:latest
                        """
                        
                        // Wait for container to start
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
                echo "Application URL: http://localhost:${APP_PORT}"
            }
        }
        failure {
            script {
                sh '''
                    docker stop ${APP_CONTAINER_NAME} || true
                    docker rm ${APP_CONTAINER_NAME} || true
                '''
            }
        }
    }
}
