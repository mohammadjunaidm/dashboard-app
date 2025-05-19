pipeline {
    agent any
    
    tools {
        maven 'Maven'
    }
    
    environment {
        TOMCAT_HOST = 'tomcat'
        TOMCAT_PORT = '8080'
        TOMCAT_CREDENTIALS = credentials('tomcat-credentials')
        APP_NAME = 'application'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build') {
            steps {
                sh 'mvn clean package'
            }
        }
        
        stage('Deploy to Tomcat') {
            steps {
                deploy adapters: [tomcat9(credentialsId: 'tomcat-credentials',
                                        path: '',
                                        url: "http://${TOMCAT_HOST}:${TOMCAT_PORT}")],
                       contextPath: "${APP_NAME}",
                       war: '**/*.war'
            }
        }
    }
    
    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed!'
        }
    }
}
