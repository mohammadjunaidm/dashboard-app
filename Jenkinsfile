pipeline {
    agent {
        docker {
            image 'python:3.9'
            args '-u root:root'
        }
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup Python Environment') {
            steps {
                sh 'pip install --upgrade pip'
                sh 'pip install -r requirements.txt'
                sh 'pip install flake8 bandit'
            }
        }
        
        stage('Run Unit Tests') {
            steps {
                sh 'python -m pytest tests/ -v'
            }
        }
        
        stage('Code Quality') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh '''
                        flake8 . \
                        --exclude=venv,migrations \
                        --max-line-length=120 \
                        --ignore=W291,W293,E303,W391,E122,E302,F401,E501 \
                        --statistics
                    '''
                }
            }
        }
        
        stage('Security Scan') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh 'bandit -r . -x tests,venv'
                }
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo 'Deploying to production...'
            }
        }
    }
    
    post {
        always {
            echo '📦 Cleaning up workspace...'
            cleanWs()
        }
        success {
            echo '✅ Build succeeded!'
        }
        failure {
            echo '❌ Build failed. Please check the logs.'
        }
    }
}
