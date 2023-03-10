# Terraform CDK 문서
https://www.terraform.io/cdktf

# 준비
- terraform 0.13.x 또는 1.x 이상 아무거나 설치
- aws cli 설정
  - https://nwiki.neowiz.com/x/f4EpBw 에 있는 aws cli 설정
  - ~/.aws/config 파일에 sts_regional_endpoints 설정이 꼭 필요하다.
  - 여기서 만든 profile을 config/config-personal.yaml 에 설정해야 한다. profile을 cow-dq 로 만들었으면 config/config.yaml에 이미 설정되어 있으므로 넘어간다.

# 실행
두가지 방법이 있다.

첫번째는 cdktf 명령으로 바로 deploy 시키는 것
```bash
npx cdktf deploy [local|dq|stg|live]
```

두번째는 cdktf 명령으로 테라폼 파일을 생성한 후 terraform 을 직접 실행하는 것
```bash
npx cdktf synth [local|dq|stg|live]
cd cdktf.out/stacks/local
terraform init # 처음 실행하는 거라면...
terraform apply
```

보통은 **cdktf deploy**로 하면 되는데 cdktf의 출력이 보기 힘들거나 디버깅을 하고 싶다면 terraform을 직접 실행하는 방법으로 하자.

# 비고
**cdktf synth|deploy** 를 실행하면 cdktf.out/stacks/{스택이름}에 cdk.tf.json 파일이 생성된다. 이 디렉토리에 들어와서 **terraform import** 나 **terraform state rm** 으로 이미 만들어진 리소스를 테라폼으로 가져오거나, 삭제할 수 있다.