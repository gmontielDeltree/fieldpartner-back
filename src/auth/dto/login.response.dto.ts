import { AuthTokens } from '../../cognito/cognito.service';

export class LoginUserDto {
  id: string;
  username: string;
  email: string;
  role: string;
  language: string;
  photoName?: string;
  accountId: string;
  accountName: string;
  /** Company logo of the account (Cat A), if it has one. */
  accountLogo?: string;
  /** Licence the user belongs to (seat). */
  licenceId: string;
  countryCode: string;
  currency: string;
}

export class LoginResponseDto {
  user: LoginUserDto;
  auth: AuthTokens;
}

export class ChallengeResponseDto {
  challengeName: 'NEW_PASSWORD_REQUIRED';
  session: string;
  email: string;
}
