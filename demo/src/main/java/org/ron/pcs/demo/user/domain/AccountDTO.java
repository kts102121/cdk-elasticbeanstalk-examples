package org.ron.pcs.demo.user.domain;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

public class AccountDTO {
    @Getter
    @ToString
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class SignUpReq {
        private String username;
        private String email;
        private String password;
        private Set<Role> roles = new HashSet<>();

        public void setPassword(String password) {
            this.password = password;
        }

        public void addRole(Role role) {
            this.roles.add(role);
        }

        public Account toEntity() {
            return Account.builder()
                .username(this.username)
                .email(this.email)
                .password(this.password)
                .roles(this.roles)
                .build();                
        }
    }

    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class MyAccountReq {
        private Long id;
        private String email;
        private String username;
        private String password;

        @Builder
        public MyAccountReq(String email, String username, String password) {
            this.email = email;
            this.username = username;
            this.password = password;
        }
    }

    @Getter
    public static class Res implements Serializable {
        private String email;
        private String username;

        public Res(Account account) {
            this.email = account.getEmail();
            this.username = account.getUsername();
        }
    }
}