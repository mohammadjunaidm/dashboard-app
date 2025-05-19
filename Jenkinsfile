pipeline {
    agent any
    stages {
        stage('Check Python') {
            steps {
                sh '''
                    which python3
                    python3 --version
                    python3 -m pip --version
                '''
            }
        }
    }
}
