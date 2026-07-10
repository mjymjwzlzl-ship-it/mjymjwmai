'use client';

export default function ChineseServiceTermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-20">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">服务条款</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">第1条（目的）</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              本条款旨在规定ARATA（以下简称"公司"）提供的网络漫画服务（以下简称"服务"）的使用条件及程序、公司与会员之间的权利义务及责任事项等基本事项。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">第2条（定义）</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>① 本条款中使用的术语定义如下：</p>
              <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>"服务"是指可通过PC、移动设备等各种信息通信设备访问使用的ARATA提供的所有服务。</li>
                <li>"会员"是指按照本条款与公司签订服务使用合同，可持续使用公司提供服务的人。</li>
                <li>"临时会员"是指未注册会员，仅可使用公司提供的部分服务的人。</li>
                <li>"ID（账号）"是指会员为使用服务而设定并经公司认可的字母、数字或符号的组合。</li>
                <li>"密码"是指会员为保护个人信息而设定的字母、数字或符号的组合。</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">第3条（条款的明示和修改）</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>① 公司应将本条款内容以易于会员理解的方式在服务初始画面公布。</p>
              <p>② 公司可在不违反相关法律规定的范围内修改本条款。</p>
              <p>③ 公司修改条款时，应在修改条款生效日前7天（对会员不利的重要事项变更时为30天）通过服务公告或通知会员。</p>
              <p>④ 会员对公布或通知的修改条款有异议时，可拒绝适用修改条款并终止使用合同。</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">第4条（使用合同的成立）</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>① 使用合同在希望成为会员的人（以下简称"申请人"）同意本条款内容并申请使用，公司对此表示同意时成立。</p>
              <p>② 公司原则上按申请顺序处理使用申请。但在以下情况下，公司可限制使用申请的同意：</p>
              <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>以他人名义申请</li>
                <li>申请内容虚假、遗漏或错误</li>
                <li>以妨碍社会安宁或公序良俗为目的申请</li>
                <li>不符合公司规定的使用申请条件</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">第5条（会员信息的变更）</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              会员在注册时填写的信息发生变化时，应立即通过在线修改或其他方式通知公司。因未通知变更信息而产生的不利后果由会员自行承担。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">第6条（个人信息保护）</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>① 公司重视会员的个人信息，根据相关法律规定保护会员信息。</p>
              <p>② 公司的个人信息保护政策适用于公司运营的网站和应用程序。</p>
              <p>③ 公司可将会员信息用于以下目的：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>提供和改善服务</li>
                <li>开发和提供新服务</li>
                <li>防止非法使用</li>
                <li>提供客户服务</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">第7条（公司的义务）</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>① 公司应遵守相关法律和本条款，努力持续稳定地提供服务。</p>
              <p>② 公司应具备为保护会员个人信息（包括信用信息）所需的安全系统，并公布和遵守个人信息保护政策。</p>
              <p>③ 公司对于会员提出的关于服务使用的合理意见或投诉，应通过适当的程序进行处理。</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">第8条（会员的义务）</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>会员不得从事以下行为：</p>
              <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>申请或变更时填写虚假信息</li>
                <li>盗用他人信息</li>
                <li>更改公司公布的信息</li>
                <li>发送或公布公司规定以外的信息（计算机程序等）</li>
                <li>侵犯公司或第三方的知识产权</li>
                <li>损害公司或第三方名誉或妨碍业务</li>
                <li>公开或发布淫秽或暴力性信息或违反公序良俗的信息</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">第9条（服务的提供和变更）</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>① 公司提供以下服务：</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>网络漫画内容提供服务</li>
                <li>网络小说内容提供服务</li>
                <li>社区服务</li>
                <li>其他公司确定的服务</li>
              </ul>
              <p>② 公司可以因运营或技术需要变更提供的服务内容。</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">第10条（服务的中断）</h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>在以下情况下，公司可暂时中断服务提供：</p>
              <ul className="list-decimal list-inside space-y-2 ml-4">
                <li>因服务设施的维护、更换、定期检查或施工</li>
                <li>因停电、服务设施故障或服务使用激增导致服务正常使用困难</li>
                <li>因地震、火灾等不可抗力</li>
              </ul>
            </div>
          </section>

          <section className="pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              生效日期：2025年1月1日<br />
              最后修订：2025年1月1日
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
