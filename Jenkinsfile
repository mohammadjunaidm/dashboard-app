pipeline {
  agent any

  stages {
    stage("run frontend") {
      steps {
        echo 'executing yarn...'
        nodejs('JunaidNPM node 10.17') {
          sh 'yarn install'
        }
      }
    }

    stage("Run backend") {
      steps {
        echo 'executing Gradle...'
        withGradle() {
          sh './gradlew -v'
        }
      }
    }
  }
}
