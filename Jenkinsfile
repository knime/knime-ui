#!groovy

def BN = (BRANCH_NAME == 'master' || BRANCH_NAME.startsWith('releases/')) ? BRANCH_NAME : 'releases/2025-12'

library "knime-pipeline@$BN"

properties([
    pipelineTriggers([upstream(
        'knime-gateway/' + env.BRANCH_NAME.replaceAll('/', '%2F')
    )]),
    buildDiscarder(logRotator(numToKeepStr: '5')),
    parameters([p2Tools.getP2pruningParameter(), booleanParam(name: 'RUN_UI_TESTS', defaultValue: false, description: 'Trigger UI integration tests')]),
    disableConcurrentBuilds()
])

try {
    node('maven && java21 && large') {
        knimetools.defaultTychoBuild(updateSiteProject: 'org.knime.update.ui')

        junit '**/test-results/junit.xml'
        owasp.sendNodeJSSBOMs(readMavenPom(file: 'pom.xml').properties['revision'])
        // knimetools.processAuditResults()

        stage('Sonarqube analysis') {
            withCredentials([usernamePassword(credentialsId: 'ARTIFACTORY_CREDENTIALS', passwordVariable: 'ARTIFACTORY_PASSWORD', usernameVariable: 'ARTIFACTORY_LOGIN')]) {
                withSonarQubeEnv('Sonarcloud') {
                    withMaven(options: [artifactsPublisher(disabled: true)]) {
                        def sonarArgs = knimetools.getSonarArgsForMaven(env.SONAR_CONFIG_NAME)
                        sh """
                            mvn -Dknime.p2.repo=${P2_REPO} package $sonarArgs -DskipTests=true
                        """
                    }
                }
            }
        }
    }
    if (params.RUN_UI_TESTS == true) {
        build(wait: true, job: "knime-qa-ui-automation-ap-modern-ui-testing-ap-next//master",
                        parameters: [ string(name: 'KNIME_UI_BRANCH', value: "$BRANCH_NAME") ])
    }
} catch (ex) {
    currentBuild.result = 'FAILURE'
    throw ex
} finally {
    notifications.notifyBuild(currentBuild.result)
}
/* vim: set shiftwidth=4 expandtab smarttab: */
