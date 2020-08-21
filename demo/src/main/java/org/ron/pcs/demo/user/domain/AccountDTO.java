package org.ron.pcs.demo.user.domain;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class AccountDTO {
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class SignUpReq {
        private String email;
        private String password;

        public Account toEntity() {
            return Account.builder()
                .email(this.email)
                .password(this.password)
                .build();                
        }
    }

    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class MyAccountReq {
        private String email;
        private String password;

        @Builder
        public MyAccountReq(String email, String password) {
            this.email = email;
            this.password = password;
        }
    }

    @Getter
    public static class Res {
        private String email;

        public Res(Account account) {
            this.email = account.getEmail();
        }
    }
}