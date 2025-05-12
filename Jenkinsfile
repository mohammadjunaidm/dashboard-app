pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            steps {
                sh '''
                    python3 --version
                    pip3 install -r requirements.txt
                    python3 -m pytest tests/ || true
                '''
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([string(credentialsId: 'render-api-key', variable: 'RENDER_API_KEY')]) {
                    sh '''
                        curl -X POST \
                        -H "Accept: application/json" \
                        -H "Content-Type: application/json" \
                        "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys" \
                        -H "Authorization: Bearer ${RENDER_API_KEY}"
                    '''
                }
            }
        }
    }

    post {
        always {
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
