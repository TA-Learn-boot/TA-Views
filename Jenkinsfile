pipeline {
    agent any

    tools {
        // Manage Jenkins → Global Tool Configuration → NodeJS (e.g. 22.x)
        nodejs 'nodejs-22'
    }

    environment {
        DOCKER_IMAGE = 'ta-views'
        CONTAINER_NAME = 'ta-views'
        // Passed into the Docker build (Vite); must match a key in public/config/gateway.yaml
        VITE_APP_ENV = 'staging'
    }

    stages {
        stage('Check Node') {
            steps {
                sh 'node -v && npm -v'
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                sh 'npm ci && npm run build'
            }
        }

        stage('Docker Build & Run') {
            steps {
                sh """
                    docker build --build-arg VITE_APP_ENV=${env.VITE_APP_ENV} -t ${env.DOCKER_IMAGE}:${env.BUILD_NUMBER} .
                    docker stop ${env.CONTAINER_NAME} || true
                    docker rm ${env.CONTAINER_NAME} || true
                    docker run -d --name ${env.CONTAINER_NAME} --network ta_network -p 8081:8080 ${env.DOCKER_IMAGE}:${env.BUILD_NUMBER}
                """
            }
        }
    }
}
