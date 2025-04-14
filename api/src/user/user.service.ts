import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

interface User {
    id: number;
    name: string;
    email: string;
    password: string;
}

const USERS: User[] = [
    {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: bcrypt.hashSync('password123', 10),
    },
    {
        id: 2,
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        password: bcrypt.hashSync('password123', 10),
    },
    {
        id: 3,
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        password: bcrypt.hashSync('password123', 10),
    },
    { id: 4, name: 'admin', email: 'admin@example.com', password: bcrypt.hashSync('admin', 10) },
];

@Injectable()
export class UserService {
    getAllUsers(): User[] {
        return USERS;
    }

    getUserByName(name: string): User | undefined {
        return USERS.find((user) => user.name === name);
    }
}
