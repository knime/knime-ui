#!groovy

// Now that the KNIME AP build is moved to the new build system:
// - investigate the role of the maven build vs the nodeJS build and see if they can be combined

def BN = BRANCH_NAME == "master" || BRANCH_NAME.startsWith("releases/") ? BRANCH_NAME : "master"

library "knime-pipeline@$BN"

properties([
    buildDiscarder(logRotator(numToKeepStr: '5')),
    disableConcurrentBuilds()
])

timeout(time: 15, unit: 'MINUTES') {
    try {
    configs = [
        'NodeJS Build': {
            node('nodejs') {
                cleanWs()
                checkout scm
                knimetools.reportJIRAIssues()

                dir('org.knime.ui.js') {
                    stage('Install npm Dependencies') {
                        env.lastStage = env.STAGE_NAME
                        sh '''
                            npm ci
                        '''
                    }

                    stage('Security Audit') {
                        env.lastStage = 'Security Audit'

                        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                            retry(3) { // because npm registry sometimes breaks
                                sh '''
                                    npm run audit
                                '''
                            }
                        }
                    }

                    stage('Static Code Analysis') {
                        env.lastStage = 'Lint'
                        sh '''
                            npm run lint
                        '''
                    }

                    stage('Unit Tests') {
                        env.lastStage = env.STAGE_NAME
                        catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                        // trows exception on failing test
                            sh '''
                                npm run coverage -- --ci
                            '''
                        }
                        junit 'coverage/junit.xml'
                    }

                    if (BRANCH_NAME == "master") {
                        stage('Upload Coverage data') {
                            env.lastStage = env.STAGE_NAME
                            withCredentials([usernamePassword(credentialsId: 'SONAR_CREDENTIALS', passwordVariable: 'SONAR_PASSWORD', usernameVariable: 'SONAR_LOGIN')]) {
                                sh '''
                                    npm run sendcoverage
                                '''
                            }
                        }
                    }
                }
            }
        },
        'Tycho Build': {
            node('maven && java11') {
                knimetools.defaultTychoBuild(updateSiteProject: 'org.knime.update.ui', disableOWASP: true)
            }
        }
    ]

    parallel configs

    } catch (ex) {
        currentBuild.result = 'FAILED'
        throw ex
    }
}

// integration tests
stage('Integration Tests') {
    node('workflow-tests&&ubuntu20.04&&nodejs') {
        timeout(time: 120, unit: 'MINUTES') {

            checkout scm

            dependencies = [
                repositories: [
                    'knime-distance',
                    'knime-gateway',
                    'knime-js-base',
                    'knime-json',
                    'knime-chromium',
                    'knime-reporting',
                    'knime-stats',
                    'knime-streaming',
                    'knime-svm',
                    'knime-ui',
                    'knime-weka',
                ],
                ius: [
                    'com.knime.features.workbench.cef.feature.group'
                ]
            ]

            // get arguments for prepare instance call
            def (branches, ius, repositories, jobBaseName) = workflowTests.extractConfiguration(dependencies)

            try {
                withEnv(["REPOS=${repositories}", "ADDITIONAL_IUS=${ius}", "TIMEOUT=4200" ]) {
                    sh '''
                        source common.inc
                        source workflowTests.inc

						export TEMP="$WORKSPACE/tmp"
    					mkdir -p "$TEMP"

						determineRequiredIUs "$(path "$WORKSPACE/org.knime.ui.js/test/integration/assets/workflows")" "$ADDITIONAL_IUS" "$REPOS"

						DEST="$WORKSPACE/knime_test.app"
						prepareInstance "$DEST" "$REPOS" "$IUS"

                        export TEMP="$WORKSPACE/tmp"
                        export XDG_RUNTIME_DIR="$TEMP"
                        KNIME_TEMP="$TEMP/knime_temp"
                        RUN_CMD="$DEST/knime"
                        RUN_ARGS="-noSplash -consoleLog --launcher.suppressErrors"

                        Xvfb :$$ -pixdepths 24 -screen 0 1280x1024x24 +extension RANDR &
                        export DISPLAY=:$$
                        set +e

                        runWithWatchdog $TIMEOUT "$RUN_CMD" $RUN_ARGS -application org.knime.product.KNIME_APPLICATION \
                            -data "$(path "$WORKSPACE/org.knime.ui.js/test/integration/assets/workflows")" $preferences "" &

                        # run integration tests
                        cd ${WORKSPACE}/org.knime.ui.js
                        npm ci
                        # This also waits for the CEF debug port to be reachable
                        npm run test:integration

                        # shutdown executor
                        set -x
                        cd "$DEST"
                        testpid=$(grep  "Dknime.test.ppid=" knime.ini | cut -d '=' -f 2)  # this pid info is written by the prepareInstance method
                        EXECUTOR_PID=$(jps -v | grep $testpid | awk '{ print $1 }' | head -1)
                        if [[ -n "$EXECUTOR_PID" ]]; then                        
                            kill $EXECUTOR_PID || true
                        fi
                        # wait up to 90 seconds for executor shutdown
                        WAIT=90
                        while [[ -n "$EXECUTOR_PID" ]] && [[ $WAIT -gt 0 ]]; do
                            sleep 1
                            WAIT=$((WAIT-1))
                            EXECUTOR_PID=$(ps -e -o pid,cmd | grep "$EXECUTOR_ROOT" | grep java | awk '{ print $1 }' || true)
                        done
                    '''
                }
                junit 'org.knime.ui.js/test/integration/reports/*.xml'
            } catch (ex) {
                currentBuild.result = 'FAILED'
                throw ex
            } finally {
                notifications.notifyBuild(currentBuild.result);
                archiveArtifacts allowEmptyArchive: true,
                    artifacts: '''org.knime.ui.js/test/integration/assets/workflows/.metadata/.log'''
            }
        }
    }
}

