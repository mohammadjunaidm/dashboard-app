pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'python:3.9'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build and Test') {
            steps {
                script {
                    docker.image(DOCKER_IMAGE).inside {
                        sh 'python3 --version'
                        sh 'pip3 install -r requirements.txt'
                        sh 'python3 -m pytest tests/ || true'
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    docker.image(DOCKER_IMAGE).inside {
                        withCredentials([string(credentialsId: 'render-api-key', variable: 'RENDER_API_KEY')]) {
                            sh """
                                curl -X POST \
                                -H "Accept: application/json" \
                                -H "Content-Type: application/json" \
                                "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys" \
                                -H "Authorization: Bearer ${RENDER_API_KEY}"
                            """
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
