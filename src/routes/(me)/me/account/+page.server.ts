import type { PageServerLoad } from './$types';
import { userFormSchema } from '@types';
import { superValidate } from 'sveltekit-superforms/server';

export const load: PageServerLoad = async ({ parent }) => {
	const { user, avatar } = await parent();

	const form = await superValidate(user, userFormSchema);

	return {
		user,
		avatar,
		form
	};
};
