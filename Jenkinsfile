pipeline {
    agent {
        docker {
            image 'adoptopenjdk/openjdk11:latest'  // Base image with Java
            args '-u root:root'
        }
    }

    environment {
        TOMCAT_HOST = 'localhost'
        TOMCAT_PORT = '9090'
        TOMCAT_CREDENTIALS = credentials('tomcat-admin-credential')
    }

    stages {
        stage('Install Python') {
            steps {
                sh '''
                    apt-get update
                    apt-get install -y python3 python3-pip python3-venv
                '''
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup Python Environment') {
            steps {
                script {
                    sh '''
                        python3 --version
                        python3 -m venv venv
                        . venv/bin/activate
                        pip install --upgrade pip
                        pip install -r requirements.txt
                        pip install gunicorn
                    '''
                }
            }
        }

        stage('Run Unit Tests') {
            steps {
                sh '''
                    . venv/bin/activate
                    python -m pytest tests/ -v
                '''
            }
        }

        stage('Package Application') {
            steps {
                sh '''
                    rm -rf deploy
                    mkdir -p deploy/WEB-INF/classes
                    cp -r app3.py requirements.txt wsgi.py static templates venv deploy/WEB-INF/classes/
                    cd deploy
                    jar -cvf ../application.war .
                '''
            }
        }

        stage('Deploy to Tomcat') {
            steps {
                script {
                    // Stop existing application
                    try {
                        sh """
                            curl -s -u ${TOMCAT_CREDENTIALS_USR}:${TOMCAT_CREDENTIALS_PSW} \
                            'http://${TOMCAT_HOST}:${TOMCAT_PORT}/manager/text/stop?path=/application'
                        """
                    } catch (err) {
                        echo "Application was not running: ${err}"
                    }

                    // Deploy new version
                    sh """
                        curl -s -u ${TOMCAT_CREDENTIALS_USR}:${TOMCAT_CREDENTIALS_PSW} \
                        --upload-file application.war \
                        'http://${TOMCAT_HOST}:${TOMCAT_PORT}/manager/text/deploy?path=/application&update=true'
                    """
                }
            }
        }

        stage('Start Gunicorn') {
            steps {
                sh '''
                    . venv/bin/activate
                    gunicorn --bind 0.0.0.0:8000 wsgi:app -D --access-logfile access.log --error-logfile error.log
                '''
            }
        }
    }

    post {
        always {
            echo '🧹 Cleaning workspace...'
            cleanWs()
        }
        success {
            echo '✅ Build succeeded!'
        }
        failure {
            echo '❌ Build failed!'
        }
    }
}
