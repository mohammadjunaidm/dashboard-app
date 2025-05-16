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
                sh 'pip install flake8 bandit'  // Install additional tools for later stages
            }
        }

        stage('List Directory Contents') {
            steps {
                sh 'pwd'
                sh 'ls -la'
            }
        }
        
        stage('Run Unit Tests') {
            steps {
                sh 'pytest tests/'
            }
        }
        
        stage('Code Quality') {
            steps {
                sh 'flake8 .'
            }
        }
        
        stage('Security Scan') {
            steps {
                sh 'bandit -r . -f custom'
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'  // Only deploy from the main branch
            }
            steps {
                echo 'Deploying to production...'
                // Add your deployment steps here
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
