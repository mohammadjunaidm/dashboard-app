pipeline {
    agent {
        docker {
            image 'python:3.9'
            args '-u root'
        }
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'pip install -r requirements.txt'
            }
        }
        
        stage('Run Tests') {
            steps {
                sh 'python -m pytest tests/'
            }
        }
        
        stage('Build') {
            steps {
                sh 'pip freeze > requirements.txt'
            }
        }
        
        stage('Deploy to Render') {
            steps {
                sh 'curl -X POST https://api.render.com/deploy/srv-YOUR_RENDER_SERVICE_ID?key=YOUR_RENDER_API_KEY'
            }
        }
    }
}
