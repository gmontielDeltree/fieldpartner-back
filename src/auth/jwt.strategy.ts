import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const region     = configService.getOrThrow<string>('AWS_REGION');
    const userPoolId = configService.getOrThrow<string>('AWS_COGNITO_USER_POOL_ID');

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer:     `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
      audience:   configService.getOrThrow<string>('AWS_COGNITO_CLIENT_ID'),
      algorithms: ['RS256'],
    });
  }

  /** Attaches { cognitoId, email } to req.user in every protected route. */
  async validate(payload: any) {
    return {
      cognitoId: payload.sub as string,
      email:     payload.email as string,
    };
  }
}
