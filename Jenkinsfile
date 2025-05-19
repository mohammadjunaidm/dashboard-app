pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'python:3.8'
        APP_CONTAINER_NAME = 'flask-app-container'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build and Run Container') {
            steps {
                script {
                    // Stop and remove existing container if it exists
                    sh "docker stop ${APP_CONTAINER_NAME} || true"
                    sh "docker rm ${APP_CONTAINER_NAME} || true"

                    // Build and run the new container
                    sh """
                        docker run -d --name ${APP_CONTAINER_NAME} \
                            -p 8000:8000 \
                            -v ${WORKSPACE}:/app \
                            -w /app \
                            ${DOCKER_IMAGE} \
                            /bin/bash -c "pip install -r requirements.txt && gunicorn --bind 0.0.0.0:8000 wsgi:app"
                    """
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                sh 'sleep 10' // Wait for the application to start
                sh 'curl http://localhost:8000 || true'
            }
        }
    }

    post {
        always {
            sh "docker logs ${APP_CONTAINER_NAME}"
        }
    }
}
