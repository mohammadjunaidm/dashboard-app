pipeline {
    agent {
        docker {
            image 'python:3.9'
            args '-u root:root'  // Run as root in container
        }
    }

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
                script {
                    try {
                        sh '''
                            python --version
                            python -m venv venv
                            . venv/bin/activate
                            pip install --upgrade pip
                            pip install -r requirements.txt
                            pip install gunicorn
                        '''
                    } catch (Exception e) {
                        echo "Failed to set up Python environment: ${e.getMessage()}"
                        throw e
                    }
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
                    mkdir -p deploy/WEB-INF/classes
                    cp -r * deploy/WEB-INF/classes/ || true
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
                    gunicorn --bind 0.0.0.0:8000 wsgi:app -D
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
