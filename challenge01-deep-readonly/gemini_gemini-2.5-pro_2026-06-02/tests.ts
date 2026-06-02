import type {
  DeepReadonly,
  DeepMutable,
  DeepPartial,
  DeepRequired,
  DeepPick,
} from './types';

//========= Test Data =========//

interface User {
  id: number;
  name: string;
  details: {
    email: string;
    address?: {
      street: string;
      city: string;
    };
  };
  posts: Post[];
  followers: Set<User>;
}

interface Post {
  title: string;
  content: string;
  tags: string[];
}

const user: User = {
  id: 1,
  name: 'John Doe',
  details: {
    email: 'john.doe@example.com',
    address: {
      street: '123 Main St',
      city: 'Anytown',
    },
  },
  posts: [
    { title: 'Post 1', content: 'Content 1', tags: ['a', 'b'] },
  ],
  followers: new Set(),
};

//========= DeepReadonly =========//

type ReadonlyUser = DeepReadonly<User>;
const readonlyUser: ReadonlyUser = user;

// @ts-expect-error: Cannot assign to 'name' because it is a read-only property.
readonlyUser.name = 'Jane Doe';
// @ts-expect-error: Cannot assign to 'email' because it is a read-only property.
readonlyUser.details.email = 'jane.doe@example.com';
// @ts-expect-error: Cannot assign to 'city' because it is a read-only property.
readonlyUser.details.address!.city = 'Othertown';
// @ts-expect-error: Property 'push' does not exist on type 'readonly Post[]'.
readonlyUser.posts.push({ title: 'Post 2', content: 'Content 2', tags: [] });
// @ts-expect-error: Property 'push' does not exist on type 'readonly string[]'.
readonlyUser.posts[0].tags.push('c');
// @ts-expect-error: Property 'add' does not exist on type 'ReadonlySet<DeepReadonly<User>>'.
readonlyUser.followers.add(user);


//========= DeepMutable =========//

type MutableUser = DeepMutable<ReadonlyUser>;
const mutableUser: MutableUser = user;

mutableUser.name = 'Jane Doe';
mutableUser.details.email = 'jane.doe@example.com';
mutableUser.details.address!.city = 'Othertown';
mutableUser.posts.push({ title: 'Post 2', content: 'Content 2', tags: [] });
mutableUser.posts[0].tags.push('c');
mutableUser.followers.add(user);


//========= DeepPartial =========//

type PartialUser = DeepPartial<User>;
const partialUser: PartialUser = {};
const partialUser2: PartialUser = { details: { address: {} } };

// All properties should be optional
const id: number | undefined = partialUser.id;
const name: string | undefined = partialUser.name;
const city: string | undefined = partialUser2.details?.address?.city;


//========= DeepRequired =========//

type RequiredUser = DeepRequired<User>;
const fullyPopulatedUser: RequiredUser = {
  id: 1,
  name: 'test',
  details: {
    email: 'test@test.com',
    address: { // address is now required
      street: '123 Fake St',
      city: 'Testville'
    }
  },
  posts: [],
  followers: new Set()
};

// @ts-expect-error: 'address' is specified as optional in 'User' but is required in 'RequiredUser'
const requiredUserTest: RequiredUser = user;


// @ts-expect-error: Property 'details' is missing in type '{ id: number; name: string; posts: never[]; followers: Set<User>; }' but required in type 'DeepRequired<Partial<User>>'.
const requiredUserError: DeepRequired<Partial<User>> = {
  id: 1,
  name: 'test',
  posts: [],
  followers: new Set()
};


//========= DeepPick =========//

type PickedData = DeepPick<User, 'id' | 'details.email' | 'posts.title'>;

const picked: PickedData = {
  id: 1,
  details: {
    email: 'test@test.com',
  },
  posts: [
    { title: 'Post Title' }
  ]
};

// @ts-expect-error: Property 'name' does not exist on type 'PickedData'.
const pickedName = picked.name;
// @ts-expect-error: Property 'address' does not exist on type '{ email: string; }'.
const pickedAddress = picked.details.address;
// @ts-expect-error: Property 'content' does not exist on type '{ title: string; }'.
const pickedContent = picked.posts[0].content;

const correctId: number = picked.id;
const correctEmail: string = picked.details.email;
const correctTitle: string = picked.posts[0].title;
