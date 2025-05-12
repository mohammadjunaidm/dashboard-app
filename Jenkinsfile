pipeline {
    agent any
    
    stages {
        stage('Test Docker') {
            steps {
                sh 'docker --version'
                sh 'docker run hello-world'
            }
        }
        
        stage('Build and Test') {
            steps {
                script {
                    docker.image('python:3.9').inside {
                        sh '''
                            python --version
                            pip install --user -r requirements.txt
                            python -m pytest tests/ || true
                        '''
                    }
                }
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
