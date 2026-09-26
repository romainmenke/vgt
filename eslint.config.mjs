import baseConfig from '@mrhenry/eslint-config-mrh-wp/lib/config.mjs';
import globals from 'globals';

const jsRuleBlock = baseConfig.find( ( block ) => {
	return Array.isArray( block.files ) && block.files.some( ( file ) => {
		return file.includes( 'themes/*/private' );
	} );
} );
const sharedRules = jsRuleBlock ? jsRuleBlock.rules : {};

export default [
	{
		files: [ 'js/**/*.js' ],
		rules: sharedRules,
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: { ...globals.browser },
		},
	},
	{
		files: [ '*.js' ],
		rules: sharedRules,
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: { ...globals.node },
		},
	},
];
