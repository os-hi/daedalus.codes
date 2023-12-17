import { db } from '@server';
import { Collections } from '@types';

export const queryProject = (slug: string) =>
	db
		.collection(Collections.Projects)
		.getFirstListItem(`name~"${slug.replaceAll('-', ' ')}"`, {
			requestKey: 'project'
		})
		.then((data) => {
			data.preview = db.files.getUrl(data, data.preview);
			return data;
		});

export const queryProjectById = (id: string) =>
	db
		.collection(Collections.Projects)
		.getOne(id)
		.then((data) => {
			data.preview = db.files.getUrl(data, data.preview);
			return data;
		});

export const queryProjects = (page: number = 1, perPage: number = 10) =>
	db
		.collection(Collections.Projects)
		.getList(page, perPage, {
			sort: 'created',
			filter: db.filter('published = true'),
			requestKey: 'projects'
		})
		.then((collection) => {
			const events = collection.items.map((event) => {
				event.preview = db.files.getUrl(event, event.preview);
				return event;
			});
			collection.items = events;
			return collection;
		});
