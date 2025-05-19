pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'python:3.8'
        APP_CONTAINER_NAME = 'flask-app-container'
        DOCKER_NETWORK = 'jenkins_network'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup Network') {
            steps {
                script {
                    // Create network if it doesn't exist
                    sh '''
                        docker network create ${DOCKER_NETWORK} || true
                        docker network connect ${DOCKER_NETWORK} jenkins || true
                    '''
                }
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
                            --network ${DOCKER_NETWORK} \
                            -p 8000:8000 \
                            -v ${WORKSPACE}:/app \
                            -w /app \
                            ${DOCKER_IMAGE} \
                            /bin/bash -c "pip install -r requirements.txt && gunicorn --bind 0.0.0.0:8000 wsgi:app --access-logfile - --error-logfile -"
                    """
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                sh 'sleep 10' // Wait for the application to start
                script {
                    // Check container logs
                    sh 'docker logs ${APP_CONTAINER_NAME}'
                    // Try accessing the app through the container's IP
                    sh '''
                        CONTAINER_IP=$(docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" ${APP_CONTAINER_NAME})
                        curl http://$CONTAINER_IP:8000 || true
                    '''
                }
            }
        }
    }

    post {
        always {
            script {
                // Print container status and logs
                sh '''
                    echo "Container Status:"
                    docker ps -a | grep ${APP_CONTAINER_NAME}
                    echo "Container Logs:"
                    docker logs ${APP_CONTAINER_NAME} || true
                '''
            }
        }
    }
}
