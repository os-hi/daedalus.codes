import type { PageServerLoad } from './$types';
import { queryEvents } from '@server/queries';

export const load: PageServerLoad = () => {
	return {
		events: queryEvents()
	};
};
