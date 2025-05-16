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
                    def warFile = "application.war"

                    // Stop any existing application
                    try {
                        sh """
                            curl -v -u ${TOMCAT_CREDENTIALS_USR}:${TOMCAT_CREDENTIALS_PSW} \
                            'http://${TOMCAT_HOST}:${TOMCAT_PORT}/manager/text/undeploy?path=/application'
                        """
                    } catch (err) {
                        echo "Application was not previously deployed or couldn't be undeployed: ${err}"
                    }

                    // Deploy new WAR file
                    sh """
                        curl -v -u ${TOMCAT_CREDENTIALS_USR}:${TOMCAT_CREDENTIALS_PSW} \
                        -T ${warFile} \
                        'http://${TOMCAT_HOST}:${TOMCAT_PORT}/manager/text/deploy?path=/application&update=true'
                    """

                    // Verify deployment
                    sh """
                        curl -v -u ${TOMCAT_CREDENTIALS_USR}:${TOMCAT_CREDENTIALS_PSW} \
                        'http://${TOMCAT_HOST}:${TOMCAT_PORT}/manager/text/list' | grep 'application'
                    """

                    // Start Gunicorn (if needed)
                    sh """
                        cd ${WORKSPACE}
                        python -m gunicorn --bind 0.0.0.0:8000 wsgi:app -D
                    """
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
