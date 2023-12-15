import { message, setError, superValidate } from 'sveltekit-superforms/server';
import type { Actions } from './$types';
import { Collections, changePasswordSchema, loginSchema, registerSchema, type User } from '@types';
import { fail, redirect } from '@sveltejs/kit';
import { isExisting } from '@server/auth.services';
import { db } from '@server';
import type { ClientResponseError } from 'pocketbase';
import { INVALID_CREDENTIALS, SOMETHING_WENT_WRONG } from '@utils';

const NOT_ALLOWED_USERNAME = [
	'about',
	'courses',
	'events',
	'test',
	'user',
	'mark',
	'faq',
	'projects',
	'team',
	'contact'
];

export const actions: Actions = {
	register: async ({ request }) => {
		const form = await superValidate(request, registerSchema);

		if (!form.valid) return fail(400, { form });

		const { username, email } = form.data;

		const isUserNameTaken = await isExisting(Collections.Users, 'username', username);
		if (isUserNameTaken) return setError(form, 'username', 'Username is already taken.');

		if (NOT_ALLOWED_USERNAME.find((value) => value === form.data.username))
			return setError(form, 'username', 'Username is not allowed');

		const isEmailTaken = await isExisting(Collections.Users, 'email', email);
		if (isEmailTaken) return setError(form, 'email', 'Email is already taken.');

		try {
			// Create database record
			const { id } = await db.collection(Collections.Users).create<User>({
				...form.data,
				role: 'user'
			});

			// Create relationship between user and user_details
			await db.collection('users_details').create({
				user: id
			});

			// Request verification email
			await db.collection(Collections.Users).requestVerification(form.data.email);
		} catch (error) {
			const err = error as ClientResponseError;
			return err.response.code !== 400
				? message(form, err.response)
				: message(form, SOMETHING_WENT_WRONG, {
						status: err.response.code
					});
		}
		redirect(303, '/login');
	},
	legacy: async ({ request, locals }) => {
		const form = await superValidate(request, loginSchema);

		if (!form.valid) return message(form, 'Please fill in all required fields');

		const { key, password } = form.data;

		try {
			await locals.DB.collection(Collections.Users).authWithPassword(key, password);
		} catch (error) {
			const err = error as ClientResponseError;
			return err.response.code !== 400
				? message(form, INVALID_CREDENTIALS)
				: message(form, SOMETHING_WENT_WRONG, {
						status: err.response.code
					});
		}

		if (locals.DB.authStore.isValid && locals.DB.authStore.model) {
			locals.user = locals.DB.authStore.model;
			redirect(302, '/me');
		}

		return message(form, `Bad Request`);
	},
	logout: async ({ locals }) => {
		locals.DB.authStore.clear();
		redirect(302, '/');
	},
	changePassword: async ({ request, locals }) => {
		const form = await superValidate(request, changePasswordSchema);
		if (!form.valid) return fail(400, { form });

		try {
			if (locals.user) await db.collection(Collections.Users).update(locals.user.id, form.data);
		} catch (error) {
			const err = error as ClientResponseError;
			return err.response.code !== 400
				? message(form, INVALID_CREDENTIALS)
				: message(form, err.message, {
						status: err.response.code
					});
		}
	}
};
