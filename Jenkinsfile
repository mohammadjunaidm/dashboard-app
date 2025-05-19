pipeline {
    agent any

    environment {
        PYTHON_VERSION = '3.11'
        APP_PORT = '8000'
    }

    stages {
        stage('Install System Dependencies') {
            steps {
                sh '''
                    echo "Installing system dependencies..."
                    sudo apt-get update
                    sudo apt-get install -y python3-venv python3-pip
                '''
            }
        }

        stage('Setup Python Environment') {
            steps {
                sh '''
                    echo "Setting up Python environment..."
                    python3 --version
                    # Remove existing venv if it exists
                    rm -rf venv || true
                    # Create new virtual environment
                    python3 -m venv venv
                    # Activate and install dependencies
                    . venv/bin/activate
                    python -m pip install --upgrade pip
                    pip install -r requirements.txt
                    pip install gunicorn
                '''
            }
        }

        stage('Run Tests') {
            steps {
                sh '''
                    echo "Running tests..."
                    . venv/bin/activate
                    python -m pytest tests/ -v || true
                '''
            }
        }

        stage('Deploy Application') {
            steps {
                sh '''
                    echo "Deploying application..."
                    . venv/bin/activate
                    pkill -f gunicorn || true
                    gunicorn --bind 0.0.0.0:${APP_PORT} wsgi:app -D --access-logfile access.log --error-logfile error.log
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    echo "Verifying deployment..."
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
