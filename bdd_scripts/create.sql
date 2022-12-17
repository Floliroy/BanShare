CREATE TABLE g_usr (
    g_ur_id BIGINT,
    g_ur_name VARCHAR(50),
    g_ur_img VARCHAR(500),
    g_ur_ttv_tok VARCHAR(500),
    g_ur_shr INT,
    PRIMARY KEY(g_ur_id)
);

CREATE TABLE g_ban (
    g_bn_id VARCHAR(50),
    g_bn_ban VARCHAR(50),
    PRIMARY KEY(g_bn_id, g_bn_ban)
);

CREATE TABLE g_sub (
    g_sb_id VARCHAR(50),
    g_sb_sub VARCHAR(50),
    PRIMARY KEY(g_sb_id, g_sb_sub)
);

CREATE OR REPLACE VIEW v_all_usr AS 
SELECT u.g_ur_id, u.g_ur_name, u.g_ur_img, 0 subs, count(b.g_bn_ban) bans
FROM g_usr u, g_ban b
WHERE b.g_bn_id = u.g_ur_id
AND u.g_ur_shr = 1
GROUP BY u.g_ur_id
UNION ALL
SELECT s.g_sb_id, null g_ur_name, null g_ur_img, count(s.g_sb_sub) subs, 0 bans
FROM g_sub s
GROUP BY s.g_sb_id;

CREATE TABLE tokens (
    userId BIGINT,
    accessToken VARCHAR(50),
    refreshToken VARCHAR(100),
    expiresIn BIGINT,
    obtainmentTimestamp BIGINT,
    PRIMARY KEY(userId)
);