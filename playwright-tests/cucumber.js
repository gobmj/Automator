export default {
    default: {
        paths: ['features/**/*.feature'],
        import: ['step-definitions/**/*.js'],
        format: [
            'progress',
            'html:../reports/cucumber-report.html',
            'json:../reports/cucumber-report.json'
        ],
        publish: false,
        timeout: 30000
    }
};
