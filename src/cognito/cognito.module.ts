import { Module } from '@nestjs/common';
import { CognitoService } from './cognito.service';
import { CognitoClients } from './cognito-clients';

@Module({
  providers: [CognitoService, CognitoClients],
  exports: [CognitoService, CognitoClients],
})
export class CognitoModule {}
