pipeline {
    agent any

    environment {
        TOMCAT_HOST = 'localhost'
        TOMCAT_PORT = '9090'
        TOMCAT_CREDENTIALS = credentials('tomcat-admin-credential')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install System Dependencies') {
            steps {
                sh '''
                    sudo apt-get update
                    sudo apt-get install -y python3-venv
                '''
            }
        }

        stage('Setup Python Environment') {
            steps {
                sh '''
                    python3 -m venv venv
                    . venv/bin/activate
                    pip install --upgrade pip
                    pip install -r requirements.txt
                '''
            }
        }

        stage('Run Unit Tests') {
            steps {
                sh '''
                    . venv/bin/activate
                    pytest tests/ -v
                '''
            }
        }

        stage('Start Gunicorn') {
            steps {
                sh '''
                    . venv/bin/activate
                    pkill gunicorn || true  # stop if already running
                    nohup gunicorn --bind 0.0.0.0:8000 wsgi:app > gunicorn.log 2>&1 &
                '''
            }
        }

        // Optional: Add a health check or curl request to confirm server is up

        // Optional: Deployment to Tomcat — only needed if you're pushing static files or other assets

    }

    post {
        always {
            echo '🧹 Cleaning workspace...'
            cleanWs()
        }

        failure {
            echo '❌ Build failed!'
        }

        success {
            echo '✅ Build and deployment completed successfully.'
        }
    }
}
