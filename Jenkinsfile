pipeline {
    agent any

    tools {
        gradle 'JunaidGradle'  // Must match the name from Jenkins > Global Tool Configuration
        nodejs 'JunaidNPM_node_18' // Assuming you installed NodeJS under this name
    }

    environment {
        PATH = "${tool 'JunaidNPM_node_18'}/bin:${env.PATH}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Run frontend') {
            steps {
                echo 'executing yarn...'
                sh 'npm install -g yarn@1.13.0'
                sh 'yarn install'
            }
        }

        stage('Run backend') {
            steps {
                echo 'executing Gradle...'
                sh 'gradle -v' // or `sh 'gradle build'` to build the backend
            }
        }
    }
}
