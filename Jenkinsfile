pipeline {
    agent any

    environment {
        PYTHON_VERSION = '3.8'
        APP_PORT = '8000'
    }

    stages {
        stage('Setup Python Environment') {
            steps {
                sh '''
                    python3 --version
                    python3 -m venv venv
                    . venv/bin/activate
                    pip install --upgrade pip
                    pip install -r requirements.txt
                    pip install gunicorn
                '''
            }
        }

        stage('Run Tests') {
            steps {
                sh '''
                    . venv/bin/activate
                    python -m pytest tests/ -v
                '''
            }
        }

        stage('Deploy Application') {
            steps {
                sh '''
                    . venv/bin/activate
                    pkill -f gunicorn || true
                    gunicorn --bind 0.0.0.0:${APP_PORT} wsgi:app -D --access-logfile access.log --error-logfile error.log
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    sleep 5
                    curl http://localhost:${APP_PORT} || true
                '''
            }
        }
    }

    post {
        always {
            echo '🧹 Cleaning workspace...'
            cleanWs()
        }
        success {
            echo '✅ Build succeeded!'
        }
        failure {
            echo '❌ Build failed!'
        }
    }
}
