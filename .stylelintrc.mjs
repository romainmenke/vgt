import nesting from '@mrhenry/stylelint-mrhenry-nesting';
import propOrder from '@mrhenry/stylelint-mrhenry-prop-order';
import config from '@mrhenry/stylelint-config-mrh-wp';

export default {
	extends: config,
	plugins: [
		nesting,
		propOrder,
	],
	rules: {
		'@mrhenry/stylelint-mrhenry-nesting': [
			true,
			{
				ignoreAtRules: [ 'apply' ],
			},
		],
		'@mrhenry/stylelint-mrhenry-prop-order': true,
	},
};
