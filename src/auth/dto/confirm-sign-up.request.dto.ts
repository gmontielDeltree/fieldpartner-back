import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Email confirmation of a Cognito user created with SignUp (status UNCONFIRMED). */
export class ConfirmSignUpRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;
}
