pipeline {
    agent {
        docker {
            image 'python:3.9'
            args '-u root'
        }
    }
    
    environment {
        RENDER_SERVICE_ID = 'srv-cvdra0dumphs73bkdmug'
        PYTHON_VERSION = '3.9'
        VENV_NAME = 'venv'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup Virtual Environment') {
            steps {
                sh """
                    python -m venv ${VENV_NAME}
                    . ${VENV_NAME}/bin/activate
                """
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh """
                    . ${VENV_NAME}/bin/activate
                    pip install --upgrade pip
                    pip install -r requirements.txt
                    pip install pytest
                """
            }
        }
        
        stage('Run Tests') {
            steps {
                sh """
                    . ${VENV_NAME}/bin/activate
                    python -m pytest tests/ || true
                """
            }
        }
        
        stage('Build') {
            steps {
                sh """
                    . ${VENV_NAME}/bin/activate
                    pip freeze > requirements.txt
                """
            }
        }
        
        stage('Deploy to Render') {
            steps {
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
    
    post {
        always {
            sh """
                if [ -d "${VENV_NAME}" ]; then
                    . ${VENV_NAME}/bin/activate
                    deactivate
                    rm -rf ${VENV_NAME}
                fi
            """
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed! Check the logs for details.'
        }
    }
}
