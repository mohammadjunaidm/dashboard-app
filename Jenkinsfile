pipeline {
    agent any

    environment {
        PYTHON_VERSION = '3.8'
        APP_PORT = '8000'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup Python') {
            steps {
                sh "python${PYTHON_VERSION} -m venv venv"
                sh ". venv/bin/activate"
            }
        }

        stage('Install Dependencies') {
            steps {
                sh "venv/bin/pip install -r requirements.txt"
                sh "venv/bin/pip install gunicorn"
            }
        }

        stage('Run Tests') {
            steps {
                sh "venv/bin/python -m pytest tests/"
            }
        }

        stage('Deploy') {
            steps {
                sh "pkill -f gunicorn || true"
                sh "venv/bin/gunicorn --bind 0.0.0.0:${APP_PORT} wsgi:app -D"
            }
        }

        stage('Verify Deployment') {
            steps {
                sh "curl http://localhost:${APP_PORT}"
            }
        }
    }

    post {
        always {
            echo 'Cleaning up workspace...'
            cleanWs()
        }
    }
}
