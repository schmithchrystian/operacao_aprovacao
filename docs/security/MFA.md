# Autenticação adicional

Produção exige `ADMIN_MFA_REQUIRED=true`, `DATA_SOURCE=prisma` e `MFA_ENCRYPTION_KEY` com 32 bytes aleatórios codificados em 64 caracteres hexadecimais. A chave deve ficar no gerenciador de segredos e acompanhar o procedimento de recuperação de backup. Perdê-la impede validar autenticadores cadastrados. Não usar a chave de autenticação ou de e-mail para este fim.

O administrador inicial entra com a senha de bootstrap e configura `/seguranca`. A política bloqueia operações administrativas até a confirmação. A ativação invalida todas as sessões anteriores; o usuário guarda dez códigos de recuperação e entra novamente com senha e código TOTP ou recuperação. Nenhum segundo fator é solicitado por e-mail/SMS.

A configuração requer senha atual, chave pendente com validade de dez minutos e confirmação do código. O segredo é cifrado com AES-256-GCM associado ao ID do usuário. O TOTP segue RFC 6238/4226: SHA-1, seis dígitos, passos de trinta segundos e tolerância de um passo. O último passo consumido é atualizado por comparação atômica, rejeitando reutilização e requisições concorrentes. Códigos de recuperação têm 128 bits aleatórios, hash SHA-256 persistido e remoção atômica no consumo.

Qualquer conta com fator cadastrado exige esse fator em todos os logins, mesmo quando a configuração de obrigatoriedade é desligada. A limitação compartilhada de login antecede senha e fator. Configuração, confirmação e gerenciamento possuem intervalo mínimo persistido de três segundos.

Renovar códigos em `/seguranca` exige senha e fator atual; invalida códigos anteriores e sessões. Desativar exige as mesmas provas e é proibido para administradores/moderadores sob política obrigatória. Não existe reset público de MFA via recuperação de senha. A troca de dispositivo sob política obrigatória ainda exige procedimento administrativo assistido; preserve o autenticador e códigos de recuperação até concluir essa operação. Não foi implementado bypass automático de segundo fator.

Validação: vetores oficiais RFC 6238, integridade da cifra/vínculo por usuário, consumo concorrente PostgreSQL, invalidação de sessões na ativação, senha incorreta, regeneração e rejeição de login sem segundo fator. Fontes: https://www.rfc-editor.org/rfc/rfc6238 e https://www.rfc-editor.org/rfc/rfc4226.
