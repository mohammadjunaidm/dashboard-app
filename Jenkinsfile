pipeline {
    agent any
    agent {
        docker {
            image 'python:3.8'
            args '-u root:root --network host'
        }
    }

    environment {
        PYTHON_VERSION = '3.8'
        APP_PORT = '8000'
    }

@@ -13,44 +17,58 @@ pipeline {
            }
        }

        stage('Setup Python') {
            steps {
                sh "python${PYTHON_VERSION} -m venv venv"
                sh ". venv/bin/activate"
            }
        }

        stage('Install Dependencies') {
        stage('Setup Python Environment') {
            steps {
                sh "venv/bin/pip install -r requirements.txt"
                sh "venv/bin/pip install gunicorn"
                sh '''
                    python --version
                    python -m venv venv
                    . venv/bin/activate
                    pip install --upgrade pip
                    pip install -r requirements.txt
                    pip install gunicorn
                '''
            }
        }

        stage('Run Tests') {
            steps {
                sh "venv/bin/python -m pytest tests/"
                sh '''
                    . venv/bin/activate
                    python -m pytest tests/ -v
                '''
            }
        }

        stage('Deploy') {
        stage('Deploy Application') {
            steps {
                sh "pkill -f gunicorn || true"
                sh "venv/bin/gunicorn --bind 0.0.0.0:${APP_PORT} wsgi:app -D"
                sh '''
                    . venv/bin/activate
                    pkill -f gunicorn || true
                    gunicorn --bind 0.0.0.0:${APP_PORT} wsgi:app -D --access-logfile access.log --error-logfile error.log
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh "curl http://localhost:${APP_PORT}"
                sh '''
                    sleep 5
                    curl http://localhost:${APP_PORT} || true
                '''
            }
        }
    }

    post {
        always {
            echo 'Cleaning up workspace...'
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
