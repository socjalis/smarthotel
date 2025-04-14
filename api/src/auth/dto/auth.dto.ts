import { IsString, Length } from 'class-validator';

export class UserDto {
    @IsString()
    @Length(2, 30)
    name: string;

    @IsString()
    @Length(4, 20)
    password: string;
}
