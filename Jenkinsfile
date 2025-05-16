pipeline {
    agent any

    tools {
        // Optional: Fix Git warning (configure this in Global Tool Configuration)
        git 'Default' // Or your custom Git installation name
    }

    environment {
        DOCKER_IMAGE = 'python:3.9'
        DOCKER_WORKDIR = '/workspace'
    }

    stages {
        stage('Setup Python Environment') {
            steps {
                script {
                    docker.image(env.DOCKER_IMAGE).inside("-v ${env.WORKSPACE}:${env.DOCKER_WORKDIR} -w ${env.DOCKER_WORKDIR}") {
                        sh '''
                            echo "🔍 Checking working directory:"
                            pwd
                            echo "📂 Listing contents of /workspace:"
                            ls -la /workspace
                            echo "📂 Listing contents of current dir:"
                            ls -la
                            
                            if [ ! -f requirements.txt ]; then
                                echo "❌ requirements.txt not found! Exiting..."
                                exit 1
                            fi

                            echo "✅ Installing requirements..."
                            pip install --no-cache-dir -r requirements.txt
                        '''
                    }
                }
            }
        }

        stage('Run Unit Tests') {
            steps {
                echo '✅ Running unit tests...'
                // Example: inside Docker again
                script {
                    docker.image(env.DOCKER_IMAGE).inside("-v ${env.WORKSPACE}:${env.DOCKER_WORKDIR} -w ${env.DOCKER_WORKDIR}") {
                        sh 'pytest tests/'
                    }
                }
            }
        }

        stage('Code Quality') {
            steps {
                echo '🔍 Running code quality tools...'
                script {
                    docker.image(env.DOCKER_IMAGE).inside("-v ${env.WORKSPACE}:${env.DOCKER_WORKDIR} -w ${env.DOCKER_WORKDIR}") {
                        sh 'flake8 .'
                    }
                }
            }
        }

        stage('Security Scan') {
            steps {
                echo '🛡️ Running security scans...'
                script {
                    docker.image(env.DOCKER_IMAGE).inside("-v ${env.WORKSPACE}:${env.DOCKER_WORKDIR} -w ${env.DOCKER_WORKDIR}") {
                        sh 'bandit -r .'
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                echo '🚀 Deploying application...'
                // Add deployment script here
            }
        }
    }

    post {
        always {
            echo '📦 Cleaning up workspace...'
            cleanWs()
        }
        failure {
            echo '❌ Build failed. Please check the logs.'
        }
    }
}
