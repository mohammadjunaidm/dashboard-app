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
                echo 'Starting checkout...'
                checkout scm
                sh 'ls -la'
                sh 'git status || echo "Git not initialized"'
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
                sh '''
                echo "Triggering deploy to Render..."
                curl -X POST "https://api.render.com/deploy/srv-cvdrsdjtq21c73e8cfig?key=rnd_YxH8pwkPIufPo61po1EHTHgEf3cO"
                '''
            }
        }
    }
}
