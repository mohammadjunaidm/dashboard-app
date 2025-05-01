pipeline {
    agent any

    tools {
        gradle 'JunaidGradle'              // This must match your Gradle tool name
        nodejs 'JunaidNPM node 18'         // Fixed: use the exact NodeJS tool name
    }

    environment {
        PATH = "${tool 'JunaidNPM node 18'}/bin:${env.PATH}"
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
                sh 'gradle -v' // or 'gradle build' to trigger the build
            }
        }
    }
}
