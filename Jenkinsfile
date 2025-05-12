pipeline {
    agent any
    
    environment {
        RENDER_SERVICE_ID = 'srv-cvdra0dumphs73bkdmug'
        PYTHON_VERSION = '3.9'
    }
    
    stages {
        stage('Test Docker') {
            steps {
                script {
                    sh '''
                        docker --version
                        docker info
                        docker run hello-world
                    '''
                }
            }
        }
        
        stage('Build and Test') {
            steps {
                script {
                    docker.image("python:${PYTHON_VERSION}").inside('-u root') {
                        sh '''
                            python --version
                            pip install -r requirements.txt
                            pip install pytest pytest-cov
                            python -m pytest tests/ || true
                        '''
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    withCredentials([string(credentialsId: 'render-api-key', variable: 'RENDER_API_KEY')]) {
                        sh '''
                            curl -X POST \
                            -H "Accept: application/json" \
                            -H "Content-Type: application/json" \
                            -H "Authorization: Bearer ${RENDER_API_KEY}" \
                            "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys"
                        '''
                    }
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
            sh 'docker system prune -f || true'
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed! Check the logs for details.'
        }
    }
}
