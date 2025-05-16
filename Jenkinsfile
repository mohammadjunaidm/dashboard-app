pipeline {
    agent any

    environment {
    TOMCAT_HOST = 'localhost'
    TOMCAT_PORT = '9090'
    TOMCAT_CREDENTIALS = credentials('tomcat-admin-credential')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup Python Environment') {
            steps {
                sh 'python3 -m venv venv'
                sh '. venv/bin/activate && pip install --upgrade pip'
                sh '. venv/bin/activate && pip install -r requirements.txt'
            }
        }

        stage('Run Unit Tests') {
            steps {
                sh '. venv/bin/activate && python -m pytest tests/ -v'
            }
        }

        stage('Package Application') {
            steps {
                sh 'mkdir -p WEB-INF/classes'
                sh 'cp -R * WEB-INF/classes/ || true'
                sh 'jar -cvf application.war WEB-INF'
            }
        }

        stage('Deploy to Tomcat') {
            steps {
                script {
                    def remoteDir = "/opt/tomcat/webapps"
                    def warFile = "application.war"

                    // Stop Tomcat
                    sh "ssh ${TOMCAT_USER}@${TOMCAT_HOST} 'sudo systemctl stop tomcat'"

                    // Remove old application
                    sh "ssh ${TOMCAT_USER}@${TOMCAT_HOST} 'rm -rf ${remoteDir}/application'"
                    sh "ssh ${TOMCAT_USER}@${TOMCAT_HOST} 'rm -f ${remoteDir}/application.war'"

                    // Copy new WAR file
                    sh "scp ${warFile} ${TOMCAT_USER}@${TOMCAT_HOST}:${remoteDir}/"

                    // Start Tomcat
                    sh "ssh ${TOMCAT_USER}@${TOMCAT_HOST} 'sudo systemctl start tomcat'"

                    // Start Gunicorn
                    sh "ssh ${TOMCAT_USER}@${TOMCAT_HOST} 'cd ${remoteDir}/application && ../venv/bin/gunicorn --bind 0.0.0.0:8000 wsgi:app &'"
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
