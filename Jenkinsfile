pipeline {
  agent any

  stages {
    stage("Build") {
      steps {
        echo 'Building the application...'
        echo 'Testing and deploy at once'
      }
    }

    stage("Test") {
      steps {
        echo 'Testing the application...'
      }
    }

    stage("Deploy") {
      steps {
        echo 'Deploying the application...'
      }
    }
  }
}
